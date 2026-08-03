import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  TextInput, FlatList, ActivityIndicator, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LIGHT_THEME } from '../../theme/colors';

const { height } = Dimensions.get('window');
const THEME = LIGHT_THEME;

export default function SearchableDropdownModal({
  label,
  placeholder,
  value,
  onSelect,
  items = [],
  loading = false,
  icon = 'location-outline',
  disabled = false,
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(item => {
      const text = typeof item === 'string' ? item : (item.name || item.code || '');
      return text.toLowerCase().includes(q);
    });
  }, [items, searchQuery]);

  const displayValue = useMemo(() => {
    if (!value) return placeholder || `Select ${label}`;
    if (typeof value === 'object') return value.name || value.code || placeholder;
    const found = items.find(i => (typeof i === 'object' ? (i.code === value || i.name === value) : i === value));
    if (found && typeof found === 'object') return found.name || found.code;
    return value;
  }, [value, items, placeholder, label]);

  const handleSelectItem = (item) => {
    onSelect(item);
    setModalVisible(false);
    setSearchQuery('');
  };

  return (
    <View style={sty.wrapper}>
      {label ? <Text style={sty.label}>{label}</Text> : null}
      
      <TouchableOpacity
        style={[sty.triggerBtn, disabled && sty.triggerDisabled, !!value && sty.triggerSelected]}
        onPress={() => !disabled && setModalVisible(true)}
        activeOpacity={0.8}
        disabled={disabled}
      >
        <Ionicons name={icon} size={18} color={value ? '#FF007F' : THEME.textFaint} style={{ marginRight: 10 }} />
        <Text style={[sty.triggerText, !value && sty.placeholderText]} numberOfLines={1}>
          {displayValue}
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color="#FF007F" />
        ) : (
          <Ionicons name="chevron-down" size={16} color={THEME.textFaint} />
        )}
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity style={sty.overlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <View style={sty.modalCard} onStartShouldSetResponder={() => true}>
            
            {/* Header */}
            <View style={sty.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name={icon} size={20} color="#FF007F" style={{ marginRight: 8 }} />
                <Text style={sty.modalTitle}>Select {label || 'Option'}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={sty.closeBtn}>
                <Ionicons name="close" size={20} color={THEME.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={sty.searchBox}>
              <Ionicons name="search-outline" size={16} color={THEME.textFaint} style={{ marginRight: 8 }} />
              <TextInput
                style={sty.searchInput}
                placeholder={`Search ${label || ''}...`}
                placeholderTextColor={THEME.textFaint}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
              {!!searchQuery && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color={THEME.textFaint} />
                </TouchableOpacity>
              )}
            </View>

            {/* List */}
            {loading ? (
              <View style={sty.loadingWrap}>
                <ActivityIndicator size="large" color="#FF007F" />
                <Text style={sty.loadingText}>Fetching options...</Text>
              </View>
            ) : filteredItems.length === 0 ? (
              <View style={sty.emptyWrap}>
                <Ionicons name="alert-circle-outline" size={32} color={THEME.textFaint} />
                <Text style={sty.emptyText}>No results found</Text>
              </View>
            ) : (
              <FlatList
                data={filteredItems}
                keyExtractor={(item, index) => (typeof item === 'string' ? item : item.code || item.name || index.toString())}
                style={{ maxHeight: height * 0.45 }}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const itemText = typeof item === 'string' ? item : (item.name || item.code);
                  const isSelected = typeof value === 'string' 
                    ? (itemText === value || item.code === value) 
                    : (item === value);
                  
                  return (
                    <TouchableOpacity
                      style={[sty.itemRow, isSelected && sty.itemRowSelected]}
                      onPress={() => handleSelectItem(item)}
                    >
                      <Text style={[sty.itemText, isSelected && sty.itemTextSelected]}>
                        {itemText}
                      </Text>
                      {isSelected && <Ionicons name="checkmark" size={18} color="#FF007F" />}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const sty = StyleSheet.create({
  wrapper: { marginBottom: 12 },
  label: { fontSize: 12.5, fontWeight: '700', color: THEME.textSec, marginBottom: 6 },
  triggerBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 14, borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  triggerSelected: {
    borderColor: 'rgba(255,0,127,0.4)',
    backgroundColor: 'rgba(255,0,127,0.03)',
  },
  triggerDisabled: { opacity: 0.5, backgroundColor: 'rgba(0,0,0,0.02)' },
  triggerText: { flex: 1, fontSize: 13.5, fontWeight: '600', color: THEME.textPrimary },
  placeholderText: { color: THEME.textFaint, fontWeight: '400' },
  
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 30, maxHeight: height * 0.75,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: THEME.textPrimary },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' },

  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
  },
  searchInput: { flex: 1, fontSize: 13.5, color: THEME.textPrimary },

  itemRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  itemRowSelected: { backgroundColor: 'rgba(255,0,127,0.06)', borderRadius: 10 },
  itemText: { fontSize: 14, color: THEME.textPrimary, fontWeight: '500' },
  itemTextSelected: { color: '#FF007F', fontWeight: '800' },

  loadingWrap: { paddingVertical: 30, alignItems: 'center' },
  loadingText: { fontSize: 13, color: THEME.textFaint, marginTop: 8 },
  emptyWrap: { paddingVertical: 30, alignItems: 'center' },
  emptyText: { fontSize: 13, color: THEME.textFaint, marginTop: 6 },
});
